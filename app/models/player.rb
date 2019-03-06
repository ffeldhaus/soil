class Player < ApplicationRecord
  # Include default devise modules.
  devise :database_authenticatable,
         :rememberable,
         :validatable

  include DeviseTokenAuth::Concerns::User

  belongs_to :game
  has_many :rounds, :autosave => true, :dependent => :destroy
  accepts_nested_attributes_for :rounds

  after_create do
    # TODO: add game id to round
    @first_round ||= self.rounds.build number: 1, game_id: self.game_id
  end
end
