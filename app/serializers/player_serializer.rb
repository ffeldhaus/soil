class PlayerSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :name, :game_id

  has_many :rounds, serializer: RoundSerializer
end
