class AuthorizeService
  def initialize(headers = {})
    @headers = headers
  end

  def authorize
    user
  end

  private

  attr_reader :headers

  def user
    if decoded_auth_token
      case decoded_auth_token[:role]
      when "Player"
        @user ||= Player.find(decoded_auth_token[:user_id])
      when "Supervisor"
        @user ||= Supervisor.find(decoded_auth_token[:user_id])
      when "Admin"
        @user ||= Admin.find(decoded_auth_token[:user_id])
      end
      @user || errors.add(:token, 'Invalid token') && nil
    end
  end

  def decoded_auth_token
    @decoded_auth_token ||= JsonWebToken.decode(http_auth_header)
  end

  def http_auth_header
    if headers['Authorization'].present?
      return headers['Authorization'].split(' ').last
    else
      errors.add(:token, 'Missing token')
    end
    nil
  end
end