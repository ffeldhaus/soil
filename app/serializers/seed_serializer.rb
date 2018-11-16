class SeedSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :sum, :fieldbean, :barley, :oat, :potato, :corn, :rye, :wheat, :beet
end
