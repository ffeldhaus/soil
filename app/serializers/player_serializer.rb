class PlayerSerializer
  include FastJsonapi::ObjectSerializer
  attributes :id, :name, :game_id
  #has_many :rounds
end
