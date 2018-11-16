class Harvest < ApplicationRecord
  belongs_to :income

  after_initialize do
    self.sum ||= 0
    self.fieldbean ||= 0
    self.barley ||= 0
    self.oat ||= 0
    self.potato ||= 0
    self.corn ||= 0
    self.rye ||= 0
    self.wheat ||= 0
    self.beet ||= 0
  end
end
