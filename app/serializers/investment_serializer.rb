class InvestmentSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum, :animals, :machines
end
