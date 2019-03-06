class Admin < ApplicationRecord
  # Include default devise modules.
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable,
         :lockable,
         :confirmable

  include DeviseTokenAuth::Concerns::User

  has_many :games
end
