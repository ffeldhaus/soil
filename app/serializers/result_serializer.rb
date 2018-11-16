class ResultSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :machines, :organic,:weather, :vermin, :profit, :capital, :player
  has_one :expense
  has_one :income
  belongs_to :round
end
