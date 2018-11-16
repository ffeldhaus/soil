class GameSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :name, :current_round, :number_of_rounds

  has_many :players
end
