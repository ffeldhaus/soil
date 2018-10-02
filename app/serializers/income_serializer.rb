class IncomeSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum
  has_one :harvest
end
