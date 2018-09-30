class HarvestSerializer < ActiveModel::Serializer
  attributes :id, :sum, :fieldbean, :barley, :oat, :potatoe, :corn, :rye, :wheat, :beet
end
