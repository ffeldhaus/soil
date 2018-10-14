class FieldSerializer
  include FastJsonapi::ObjectSerializer
  set_key_transform :camel_lower

  attributes :id, :submitted

  has_many :parcels
end
