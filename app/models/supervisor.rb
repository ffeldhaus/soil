class Supervisor < ApplicationRecord
  has_secure_password
  has_many :games
  belongs_to :admin

  validates_presence_of :password, :on => :create
  validates_length_of :password, :in => 4..64, :on => :create
  validates :name, :presence => true, :uniqueness => true, :length => {:in => 4..64}
  validates_presence_of :first_name, :on => :create
  validates_presence_of :last_name, :on => :create
  validates_presence_of :email, :on => :create
end
