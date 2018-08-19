class GameSerializer
  include FastJsonapi::ObjectSerializer
  attributes :id, :name, :weather, :vermin
  has_many :players
end