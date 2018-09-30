class IncomeSerializer < ActiveModel::Serializer
  attributes :id, :sum
  has_one :harvest
end
