class RoundSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :number, :submitted

  has_one :field
  has_one :decision
  has_one :result
end
