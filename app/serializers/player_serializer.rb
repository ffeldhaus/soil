class PlayerSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :email, :game_id

  has_many :rounds, serializer: RoundSerializer
end
