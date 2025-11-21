"""respuesta para las respuestas atomicas de la API."""
'''Patron builder para respuestas de la API'''
'''Por defecto respuestas 200 OK o 400 BAD REQUEST'''
'''Hateoas con metodos para agregar links si es necesario'''
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class Link:
    rel: str
    href: str
    method: str = "GET"
    title: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        link_dict = {
            "rel": self.rel,
            "href": self.href,
            "method": self.method,
        }
        if self.title:
            link_dict["title"] = self.title
        return link_dict


@dataclass
class ApiResponse:
    status_code: int
    message: str
    data: Optional[Dict[str, Any]] = None
    links: Optional[List[Link]] = None

    @classmethod
    def ok(cls, message: str = "OK", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=200, message=message, data=data)

    @classmethod
    def bad_request(cls, message: str = "Bad Request", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=400, message=message, data=data)

    @classmethod
    def created(cls, message: str = "Created", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=201, message=message, data=data)

    @classmethod
    def no_content(cls, message: str = "No Content"):
        return cls(status_code=204, message=message)

    @classmethod
    def unauthorized(cls, message: str = "Unauthorized", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=401, message=message, data=data)

    @classmethod
    def forbidden(cls, message: str = "Forbidden", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=403, message=message, data=data)

    @classmethod
    def not_found(cls, message: str = "Not Found", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=404, message=message, data=data)

    @classmethod
    def conflict(cls, message: str = "Conflict", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=409, message=message, data=data)

    @classmethod
    def unprocessable_entity(cls, message: str = "Unprocessable Entity", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=422, message=message, data=data)

    @classmethod
    def internal_server_error(cls, message: str = "Internal Server Error", data: Optional[Dict[str, Any]] = None):
        return cls(status_code=500, message=message, data=data)

    def add_link(self, rel: str, href: str, method: str = "GET", title: Optional[str] = None):
        if self.links is None:
            self.links = []
        link = Link(rel=rel, href=href, method=method, title=title)
        self.links.append(link)
        return self
    def to_dict(self) -> Dict[str, Any]:
        response = {
            "status_code": self.status_code,
            "message": self.message,
        }
        if self.data is not None:
            response["data"] = self.data
        if self.links is not None:
            response["_links"] = [link.to_dict() for link in self.links]
        return response
    def to_json(self):
        return self.to_dict()
    def __repr__(self):
        return f"<ApiResponse status_code={self.status_code} message={self.message}>"

    def add_self_link(self, href: str):
        """Add a self link to the response"""
        return self.add_link("self", href, method="GET", title="Self")

    def add_related_links(self, related_resources: Dict[str, str]):
        """Add multiple related resource links"""
        for rel, href in related_resources.items():
            self.add_link(rel, href)
        return self
    
"""Paged response para respuestas paginadas de la API."""

@dataclass
class PagedApiResponse(ApiResponse):
    page: int = 1
    per_page: int = 10
    total_items: int = 0
    total_pages: int = 0

    @classmethod
    def ok(cls, message: str = "OK", data: Optional[Dict[str, Any]] = None,
           page: int = 1, per_page: int = 10,
           total_items: int = 0, total_pages: int = 0):
        instance = cls(status_code=200, message=message, data=data,
                       page=page, per_page=per_page,
                       total_items=total_items, total_pages=total_pages)
        # Add HATEOAS links for pagination
        instance.add_link("self", f"?page={page}&per_page={per_page}", title="Current page")
        if page > 1:
            instance.add_link("first", f"?page=1&per_page={per_page}", title="First page")
            instance.add_link("prev", f"?page={page-1}&per_page={per_page}", title="Previous page")
        if page < total_pages:
            instance.add_link("next", f"?page={page+1}&per_page={per_page}", title="Next page")
            instance.add_link("last", f"?page={total_pages}&per_page={per_page}", title="Last page")
        return instance

    def to_dict(self) -> Dict[str, Any]:
        response = super().to_dict()
        response.update({
            "page": self.page,
            "per_page": self.per_page,
            "total_items": self.total_items,
            "total_pages": self.total_pages,
        })
        return response
    def __repr__(self):
        return (f"<PagedApiResponse status_code={self.status_code} message={self.message} "
                f"page={self.page} per_page={self.per_page} "
                f"total_items={self.total_items} total_pages={self.total_pages}>")

    def add_pagination_links(self, base_url: str):
        """Add pagination links with a custom base URL"""
        self.links = []  # Reset links
        self.add_link("self", f"{base_url}?page={self.page}&per_page={self.per_page}", title="Current page")
        if self.page > 1:
            self.add_link("first", f"{base_url}?page=1&per_page={self.per_page}", title="First page")
            self.add_link("prev", f"{base_url}?page={self.page-1}&per_page={self.per_page}", title="Previous page")
        if self.page < self.total_pages:
            self.add_link("next", f"{base_url}?page={self.page+1}&per_page={self.per_page}", title="Next page")
            self.add_link("last", f"{base_url}?page={self.total_pages}&per_page={self.per_page}", title="Last page")
        return self

    def add_resource_links(self, resource_id: str, base_url: str):
        """Add standard CRUD links for a resource"""
        self.add_link("self", f"{base_url}/{resource_id}", method="GET", title="Get resource")
        self.add_link("update", f"{base_url}/{resource_id}", method="PUT", title="Update resource")
        self.add_link("delete", f"{base_url}/{resource_id}", method="DELETE", title="Delete resource")
        return self

    def add_collection_links(self, base_url: str):
        """Add links for collection operations"""
        self.add_link("self", base_url, method="GET", title="Get collection")
        self.add_link("create", base_url, method="POST", title="Create resource")
        return self
    

def example_usage():
    # Example of creating a simple API response
    response = ApiResponse.ok(message="Data retrieved successfully", data={"key": "value"})
    response.add_self_link("/api/resource/1")
    print(response.to_json())

    # Example of creating a paged API response
    paged_response = PagedApiResponse.ok(
        message="Paged data retrieved successfully",
        data={"items": ["item1", "item2"]},
        page=2,
        per_page=10,
        total_items=50,
        total_pages=5
    )
    paged_response.add_pagination_links("/api/resources")
    print(paged_response.to_json())