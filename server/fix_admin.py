from app import app, db
from models.users import Users
from models.roles import Roles
from models.userrole import UserRole

with app.app_context():
    # 1. Asegurar roles
    super_admin_role = Roles.query.filter_by(name='Super Administrator').first()
    if not super_admin_role:
        super_admin_role = Roles(name='Super Administrator', slug='super-admin')
        db.session.add(super_admin_role)
        db.session.commit()

    # 2. Configurar usuario admin
    admin = Users.query.filter((Users.username == 'admin') | (Users.email == 'admin@foresight.com')).first()
    if not admin:
        admin = Users(username='admin', email='admin@foresight.com', jwt_auth_active=True)
        db.session.add(admin)
        db.session.commit()
    
    admin.username = 'admin'
    admin.email = 'admin@foresight.com'
    admin.set_password('Admin123!')  # Mayuscula + minusculas + numeros + especial (!)
    admin.jwt_auth_active = True
    
    # Asignar Super Administrator
    if super_admin_role not in admin.roles:
        admin.roles.append(super_admin_role)
    
    db.session.commit()
    print("EXITO: Admin configurado correctamente.")
    print("Email: admin@foresight.com")
    print("Password: Admin123!")
    print("Verificacion password:", admin.check_password("Admin123!"))
    print("Roles:", [r.name for r in admin.roles])
