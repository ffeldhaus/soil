class Result < ApplicationRecord
  belongs_to :round
  belongs_to :previous_round, class_name: 'Round'
  has_one :expense
  has_one :income

  after_initialize do
    self.profit ||= 0
    self.capital ||= 20000
    self.save!
    self.create_expense unless self.expense
    self.create_income unless self.income
  end
end
