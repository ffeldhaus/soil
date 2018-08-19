class Admin < ApplicationRecord
  has_secure_password
  has_many :supervisors

  validates_presence_of :password, :on => :create
  validates_length_of :password, :in => 6..20, :on => :create
  validates :name, :presence => true, :uniqueness => true, :length => {:in => 4..64}
end
