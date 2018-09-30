class ExpenseSerializer < ActiveModel::Serializer
  attributes :id, :sum

  has_one :seed
  has_one :investment
  has_one :running_cost
end
