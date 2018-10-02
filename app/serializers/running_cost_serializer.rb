class RunningCostSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum, :organic_control, :fertilize, :pesticide, :organisms, :animals, :base
end
