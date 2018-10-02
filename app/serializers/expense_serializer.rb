class ExpenseSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum

  has_one :seed
  has_one :investment
  has_one :running_cost
end
