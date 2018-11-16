class Game < ApplicationRecord
  has_many :players, autosave: true, dependent: :destroy
  has_many :rounds, through: :players
  belongs_to :supervisor
  serialize :weather
  serialize :vermin
  accepts_nested_attributes_for :players

  validates :name, :presence => true, :uniqueness => true, :length => {:in => 4..64}

  after_initialize do
    self.weather ||= %w|Normal| + %w|Normal Normal Dürre Kälte Überschwemmung Dürre Kälte Überschwemmung Dürre Kälte Überschwemmung|.shuffle
    self.vermin ||= %w|Keine| + %w|Keine Blattlaus Fritfliege Kartoffelkäfer Maiszünsler Drahtwurm Blattlaus Fritfliege Kartoffelkäfer Maiszünsler Drahtwurm|.shuffle
    self.current_round ||= 1
    self.number_of_rounds ||= 12
  end

  def start_new_round
    if Round.where(game_id: self.id).all? { |round| round.submitted && round.number <= self.current_round && !round.last}
      self.current_round = self.current_round + 1
      self.save!
      Player.where(game_id: self.id).each do |player|
        next_round = player.rounds.create(number: player.rounds.length + 1, game_id: self.id)
        if self.current_round == self.number_of_rounds
            next_round.last = true
        end
        next_round.calculate_attributes
      end
    end
  end
end
