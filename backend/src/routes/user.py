from flask import Blueprint, jsonify, request
from models.user import User, db

user_bp = Blueprint('user', __name__)


@user_bp.route('/', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])


@user_bp.route('/', methods=['POST'])
def create_user():
    data = request.json
    if not all(k in data for k in ('username', 'email', 'password')):
        return jsonify({'error': 'Campos obrigatórios ausentes'}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        password=data['password'],
        role=data.get('role', 'usuario_padrao'),
        obra_id=data.get('obra_id'),
        must_change_password=True
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@user_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@user_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    user.role = data.get('role', user.role)
    user.obra_id = data.get('obra_id', user.obra_id)

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify(user.to_dict())


@user_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204


@user_bp.route('/<int:user_id>/change-password', methods=['POST'])
def change_password(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({'error': 'Nova senha é obrigatória'}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'Senha atualizada com sucesso'}), 200
