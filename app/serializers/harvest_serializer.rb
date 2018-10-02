class HarvestSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum, :fieldbean, :barley, :oat, :potatoe, :corn, :rye, :wheat, :beet
end
