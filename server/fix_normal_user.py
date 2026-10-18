from app import app, db
from models.users import Users
from models.roles import Roles

with app.app_context():
    # Asegurar rol normal
    user_role = Roles.query.filter_by(name='Normal User').first()
    if not user_role:
        user_role = Roles(name='Normal User', slug='user')
        db.session.add(user_role)
        db.session.commit()

    # Crear o actualizar usuario normal
    user = Users.query.filter((Users.username == 'usuario') | (Users.email == 'user@foresight.com')).first()
    if not user:
        user = Users(username='usuario', email='user@foresight.com', jwt_auth_active=True)
        db.session.add(user)
    
    user.username = 'usuario'
    user.email = 'user@foresight.com'
    user.set_password('User123!')
    user.jwt_auth_active = True
    
    if user_role not in user.roles:
        user.roles.append(user_role)
    
    db.session.commit()
    print("Usuario normal configurado: user@foresight.com / User123!")
