class Income < ApplicationRecord
  belongs_to :result
  has_one :harvest

  after_initialize do
    self.sum ||= 0
    self.save!
    self.create_harvest unless self.harvest
  end
end
