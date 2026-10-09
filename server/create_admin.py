from app import app, db
from models.users import Users
from models.roles import Roles

with app.app_context():
    # 1. Crear el rol si no existe
    role_name = "Super Administrator"
    role = Roles.query.filter_by(name=role_name).first()
    if not role:
        role = Roles(name=role_name, slug="super-administrator")
        db.session.add(role)
        db.session.commit()
        print(f"Rol '{role_name}' creado.")
        
    # 2. Crear el usuario si no existe
    admin = Users.query.filter_by(username="admin").first()
    if not admin:
        admin = Users(username="admin", email="admin@foresight.com", jwt_auth_active=True)
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("Usuario 'admin' creado.")
    else:
        # Forzar la contraseña a admin123 por si acaso
        admin.set_password("admin123")
        db.session.commit()
        print("Usuario 'admin' ya existia. Contraseña reseteada a 'admin123'.")
    
    # 3. Asignar el rol al usuario
    if role not in admin.roles:
        admin.roles.append(role)
        db.session.commit()
        print("Rol asignado al usuario.")
        
    print(f"\\nEXITO: Usa el usuario 'admin' y contrasena 'admin123' para iniciar sesion en la web.")
