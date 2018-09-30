class RunningCostSerializer < ActiveModel::Serializer
  attributes :id, :sum, :organic_control, :fertilize, :pesticide, :organisms, :animals, :base
end
