import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SuperadminService } from '../../services/superadmin.service';

interface Organizador {
  id_usuario: number;
  nombre: string;
  email: string;
  activo: boolean;
  email_verified: boolean;
  campeonato?: string;
  fecha_registro: string;
}

@Component({
  selector: 'app-organizadores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './organizadores.component.html',
  styleUrls: ['./organizadores.component.scss']
})
export class OrganizadoresComponent implements OnInit {
  private superadminService = inject(SuperadminService);
  private fb = inject(FormBuilder);

  isLoading = signal(true);
  showModal = signal(false);
  isSubmitting = signal(false);
  searchTerm = signal('');
  filterStatus = signal('Todos');
  
  organizadores = signal<Organizador[]>([]);
  filteredOrganizadores = signal<Organizador[]>([]);

  successMessage = signal('');
  errorMessage = signal('');

  createForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, this.gmailValidator]],
    nombre_campeonato: ['', [Validators.required, Validators.minLength(3)]]
  });

  ngOnInit() {
    this.loadOrganizadores();
  }

  gmailValidator(control: any) {
    if (!control.value) return null;
    const isGmail = control.value.toLowerCase().endsWith('@gmail.com');
    return isGmail ? null : { notGmail: true };
  }

  loadOrganizadores() {
    this.isLoading.set(true);
    this.superadminService.getOrganizadores().subscribe({
      next: (response) => {
        this.organizadores.set(response.organizadores || []);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading organizadores:', err);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters() {
    let filtered = this.organizadores();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(org => 
        org.nombre.toLowerCase().includes(term) ||
        org.email.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() !== 'Todos') {
      const isActive = this.filterStatus() === 'Activo';
      filtered = filtered.filter(org => org.activo === isActive);
    }

    this.filteredOrganizadores.set(filtered);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilters();
  }

  onStatusChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterStatus.set(select.value);
    this.applyFilters();
  }

  openModal() {
    this.showModal.set(true);
    this.createForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeModal() {
    this.showModal.set(false);
    this.createForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onSubmit() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.superadminService.createOrganizador(this.createForm.value).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Organizador creado exitosamente');
        
        if (response.credenciales_temporales) {
          const credenciales = response.credenciales_temporales;
          const mensaje = `
Organizador creado exitosamente

Email: ${credenciales.email}
Password: ${credenciales.password}

IMPORTANTE: Guarda estas credenciales de forma segura y envialas al organizador
          `.trim();
          
          alert(mensaje);
        }
        
        setTimeout(() => {
          this.closeModal();
          this.loadOrganizadores();
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Error al crear el organizador');
      }
    });
  }

  getStatusBadgeClass(activo: boolean): string {
    return activo ? 'status-active' : 'status-inactive';
  }

  get nombreInvalid(): boolean {
    const control = this.createForm.get('nombre');
    return !!(control?.invalid && control?.touched);
  }

  get emailInvalid(): boolean {
    const control = this.createForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get campeonatoInvalid(): boolean {
    const control = this.createForm.get('nombre_campeonato');
    return !!(control?.invalid && control?.touched);
  }
}