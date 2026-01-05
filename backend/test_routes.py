from app import create_app
import os

app = create_app()

with app.app_context():
    # Verificar ruta de uploads
    uploads_dir = os.path.join(os.path.dirname(app.root_path), 'uploads')
    print(f"📂 Directorio uploads: {uploads_dir}")
    print(f"📂 ¿Existe? {os.path.exists(uploads_dir)}")
    
    # Verificar archivo específico
    pdf_path = os.path.join(uploads_dir, 'documentos_jugadores', 'jugador_1_0104578923.pdf')
    print(f"📄 Ruta PDF: {pdf_path}")
    print(f"📄 ¿Existe? {os.path.exists(pdf_path)}")
    
    # Listar archivos
    doc_dir = os.path.join(uploads_dir, 'documentos_jugadores')
    if os.path.exists(doc_dir):
        files = os.listdir(doc_dir)
        print(f"📋 Archivos en documentos_jugadores:")
        for f in files:
            print(f"   - {f}")