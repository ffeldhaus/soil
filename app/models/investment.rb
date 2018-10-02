class Investment < ApplicationRecord
  belongs_to :expense

  after_initialize do
    self.sum ||= 0
    self.animals ||= 0
    self.machines ||= 0
  end
end
