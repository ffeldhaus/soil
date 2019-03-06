class Game < ApplicationRecord
  has_many :players, autosave: true, dependent: :destroy
  has_many :rounds, through: :players
  belongs_to :admin
  serialize :weather
  serialize :vermin
  accepts_nested_attributes_for :players

  validates :name, :presence => true, :length => {:in => 4..128}

  after_initialize do
    self.current_round ||= 1
    self.number_of_rounds ||= 11
    # ensure that game always start with normal weather and that it includes all weather conditions a similar number of times
    self.weather ||= %w|Normal| + (self.number_of_rounds.to_f / 5).ceil.times.map { %w|Normal Normal Dürre Überschwemmung Kälte|.shuffle }.flatten.first(self.number_of_rounds - 1)
    # ensure that game always start with no vermin and that it includes all vermins a similar number of times
    self.vermin ||= %w|Keine| + (self.number_of_rounds.to_f / 6).ceil.times.map {  %w|Keine Blattlaus Fritfliege Kartoffelkäfer Maiszünsler Drahtwurm|.shuffle }.flatten.first(self.number_of_rounds - 1)
  end

  def start_new_round
    if Round.where(game_id: self.id).all? { |round| round.submitted && round.number <= self.current_round && !round.last}
      self.current_round = self.current_round + 1
      self.save!
      Player.where(game_id: self.id).each do |player|
        next_round = player.rounds.create(number: player.rounds.length + 1, game_id: self.id)
        if self.current_round == self.number_of_rounds
            next_round.last = true
            next_round.save!
        end
        next_round.calculate_attributes
      end
    end
  end
end
