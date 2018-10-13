class RoundSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :number, :submitted, :machines, :organic, :pesticide, :fertilize, :organisms

  has_one :field
  has_one :result
end
