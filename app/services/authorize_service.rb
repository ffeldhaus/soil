class AuthorizeService
  def initialize(headers = {})
    @headers = headers
    @errors = ()
  end

  def authorize
    user
  end

  private

  attr_reader :headers
  attr_accessor :errors

  def user
    if decoded_auth_token[:id]
      case decoded_auth_token[:role]
      when "Player"
        @user ||= Player.find(decoded_auth_token[:id])
      when "Admin"
        @user ||= Admin.find(decoded_auth_token[:id])
      when "Supervisor"
        @user ||= Supervisor.find(decoded_auth_token[:id])
      end
      # @user || errors.add(:token, 'Invalid token') && nil
    end
  end

  def decoded_auth_token
    @decoded_auth_token ||= JsonWebToken.decode(http_auth_header)
  end

  def http_auth_header
    if headers['Authorization'].present?
      return headers['Authorization'].split(' ').last
    else
      # errors.add(:token, 'Missing token')
    end
    nil
  end
end