class ParcelSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :number, :nutrition, :soil, :cropsequence, :harvest_yield, :harvest, :plantation
end
