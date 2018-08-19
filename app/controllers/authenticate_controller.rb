class AuthenticateController < ApplicationController
  skip_before_action :authenticate_request

  def login
    authenticate params[:name], params[:password], params[:game_id]
  end

  private

  def authenticate(name, password, game_id)
    player = Player.where({ :name => name, :game_id => game_id}).first

    if player && player.authenticate(password)
      user = player
    end

    supervisor = Supervisor.find_by_name(name)
    if supervisor && supervisor.authenticate(password)
      user = supervisor
    end

    admin = Admin.find_by_name(name)
    if admin && admin.authenticate(password)
      user = admin
    end

    expiration = Rails.configuration.jwt_default_expiration_hours.hours.from_now

    access_token = JsonWebToken.encode({user_id: user.id, role: user.class.name}, expiration) if user

    if access_token
      render json: {
          access_token: access_token,
          role: user.class.name.downcase,
          expiration: expiration,
          message: 'Login Successful'
      }
    else
      render json: { error: 'Invalid credentials' }, status: :unauthorized
    end
  end
end
