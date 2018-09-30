class ResultSerializer < ActiveModel::Serializer
  attributes :id, :machines, :organic,:weather, :vermin, :profit, :capital
  has_one :expense
  has_one :income
end
