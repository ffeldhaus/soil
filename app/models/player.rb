class Player < ApplicationRecord
  belongs_to :game
  has_many :rounds, :autosave => true, :dependent => :destroy
  accepts_nested_attributes_for :rounds
  has_secure_password

  validates_presence_of :password, :on => :create
  validates_length_of :password, :in => 4..64, :on => :create
  validates :name, :presence => true, :length => {:in => 4..64}

  after_create do
    # TODO: add game id to round
    @first_round ||= self.rounds.build number: 1, game_id: self.game_id
  end
end
