class Round < ApplicationRecord
  belongs_to :player
  belongs_to :game
  has_one :field, :autosave => true, :dependent => :destroy
  has_one :result, :autosave => true, :dependent => :destroy

  accepts_nested_attributes_for :field

  MACHINE_AGING = 5

  SOIL = 80
  SOIL_FALLOW = 0.1
  SOIL_CROPSEQUENCE = 0.03
  SOIL_PLANTATION = 0.02
  SOIL_FERTILIZE = 0.05
  SOIL_ANIMALS = 0.02
  SOIL_PESTICIDE = 0.04
  SOIL_MACHINE = 0.05
  SOIL_MONOCULTURE = 0.02
  SOIL_FLOOD = 0.05
  SOIL_DROUGHT = 0.03

  NUTRITION = 80
  NUTRITION_DECLINE = 0.15
  NUTRITION_FERTILIZE = 0.5
  NUTRITION_ANIMALS = 0.3
  NUTRITION_FIELDBEAN = 0.1

  HARVEST = {'Tiere' => 0,
             'Brachland' => 0,
             'Ackerbohne' => 60,
             'Gerste' => 95,
             'Hafer' => 70,
             'Kartoffel' => 370,
             'Mais' => 110,
             'Roggen' => 100,
             'Weizen' => 115,
             'Zuckerruebe' => 570}
  HARVEST_SOIL_NORMAL = 1.0
  HARVEST_SOIL_STRONG = 1.2
  HARVEST_SOIL = {'Ackerbohne' => HARVEST_SOIL_NORMAL,
                  'Gerste' => HARVEST_SOIL_STRONG,
                  'Hafer' => HARVEST_SOIL_NORMAL,
                  'Kartoffel' => HARVEST_SOIL_STRONG,
                  'Mais' => HARVEST_SOIL_NORMAL,
                  'Roggen' => HARVEST_SOIL_NORMAL,
                  'Weizen' => HARVEST_SOIL_STRONG,
                  'Zuckerruebe' => HARVEST_SOIL_NORMAL}
  HARVEST_NUTRITION_LOW = 0.8
  HARVEST_NUTRITION_NORMAL = 1.0
  HARVEST_NUTRITION_STRONG = 1.2
  HARVEST_NUTRITION = {'Ackerbohne' => HARVEST_NUTRITION_LOW,
                       'Gerste' => HARVEST_NUTRITION_LOW,
                       'Hafer' => HARVEST_NUTRITION_NORMAL,
                       'Kartoffel' => HARVEST_NUTRITION_STRONG,
                       'Mais' => HARVEST_NUTRITION_NORMAL,
                       'Roggen' => HARVEST_NUTRITION_LOW,
                       'Weizen' => HARVEST_NUTRITION_STRONG,
                       'Zuckerruebe' => HARVEST_NUTRITION_STRONG}
  HARVEST_WEATHER_STRONG = 0.85
  HARVEST_WEATHER_MODERATE = 0.95
  HARVEST_WEATHER = {'Ackerbohne' => {'Kälte' => HARVEST_WEATHER_MODERATE, 'Dürre' => HARVEST_WEATHER_STRONG, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Gerste' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_STRONG, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Hafer' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_MODERATE, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Kartoffel' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_MODERATE, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Mais' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_MODERATE, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Roggen' => {'Kälte' => HARVEST_WEATHER_MODERATE, 'Dürre' => HARVEST_WEATHER_MODERATE, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Weizen' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_MODERATE, 'Überschwemmung' => HARVEST_WEATHER_STRONG},
                     'Zuckerruebe' => {'Kälte' => HARVEST_WEATHER_STRONG, 'Dürre' => HARVEST_WEATHER_STRONG, 'Überschwemmung' => HARVEST_WEATHER_STRONG}}
  HARVEST_VERMIN_PESTICIDE = 0.95
  HARVEST_VERMIN_ORGANISM = 0.9
  HARVEST_VERMIN_WITHOUT = 0.7
  HARVEST_VERMIN = {'Ackerbohne' => {'Blattlaus' => true, 'Fritfliege' => false, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Gerste' => {'Blattlaus' => false, 'Fritfliege' => true, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Hafer' => {'Blattlaus' => false, 'Fritfliege' => true, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Kartoffel' => {'Blattlaus' => false, 'Fritfliege' => false, 'Kartoffelkäfer' => true, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Mais' => {'Blattlaus' => false, 'Fritfliege' => false, 'Kartoffelkäfer' => false, 'Maiszünsler' => true, 'Drahtwurm' => false},
                    'Roggen' => {'Blattlaus' => true, 'Fritfliege' => false, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Weizen' => {'Blattlaus' => true, 'Fritfliege' => false, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => false},
                    'Zuckerruebe' => {'Blattlaus' => false, 'Fritfliege' => false, 'Kartoffelkäfer' => false, 'Maiszünsler' => false, 'Drahtwurm' => true}}
  HARVEST_CROPSEQUENCE = 0.2
  HARVEST_EFFICIENCY = 0.02
  HARVEST_MACHINES = 0.5
  HARVEST_ANIMALS = 10

  MACHINES = 100

  CROPSEQUENCE = {'Ackerbohne' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'gut', 'Hafer' => 'gut', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'gut', 'Weizen' => 'gut', 'Zuckerruebe' => 'gut'},
                  'Gerste' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'ok', 'Hafer' => 'schlecht', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'gut', 'Weizen' => 'gut', 'Zuckerruebe' => 'ok'},
                  'Hafer' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'gut', 'Hafer' => 'schlecht', 'Kartoffel' => 'ok', 'Mais' => 'gut', 'Roggen' => 'gut', 'Weizen' => 'gut', 'Zuckerruebe' => 'ok'},
                  'Kartoffel' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'ok', 'Hafer' => 'ok', 'Kartoffel' => 'schlecht', 'Mais' => 'ok', 'Roggen' => 'ok', 'Weizen' => 'ok', 'Zuckerruebe' => 'ok'},
                  'Mais' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'schlecht', 'Hafer' => 'ok', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'schlecht', 'Weizen' => 'schlecht', 'Zuckerruebe' => 'gut'},
                  'Roggen' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'gut', 'Hafer' => 'gut', 'Kartoffel' => 'gut', 'Mais' => 'ok', 'Roggen' => 'gut', 'Weizen' => 'ok', 'Zuckerruebe' => 'ok'},
                  'Weizen' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'schlecht', 'Hafer' => 'ok', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'schlecht', 'Weizen' => 'schlecht', 'Zuckerruebe' => 'gut'},
                  'Zuckerruebe' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'ok', 'Hafer' => 'ok', 'Kartoffel' => 'gut', 'Mais' => 'ok', 'Roggen' => 'ok', 'Weizen' => 'ok', 'Zuckerruebe' => 'schlecht'},
                  'Brachland' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'gut', 'Hafer' => 'gut', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'gut', 'Weizen' => 'gut', 'Zuckerruebe' => 'gut'},
                  'Tiere' => {'Tiere' => 'gut', 'Brachland' => 'gut', 'Ackerbohne' => 'gut', 'Gerste' => 'gut', 'Hafer' => 'gut', 'Kartoffel' => 'gut', 'Mais' => 'gut', 'Roggen' => 'gut', 'Weizen' => 'gut', 'Zuckerruebe' => 'gut'}}

  SEED_FIELDBEAN = {false => -120, true => -144}
  SEED_BARLEY = {false => -68, true => -85}
  SEED_OAT = {false => -60, true => -75}
  SEED_POTATOE = {false => -110, true => -133}
  SEED_CORN = {false => -70, true => -84}
  SEED_RYE = {false => -76, true => -95}
  SEED_WHEAT = {false => -72, true => -90}
  SEED_BEET = {false => -120, true => -144}

  INVESTMENT_ANIMALS = -1000
  INVESTMENT_MACHINES = -1000

  RUNNINGCOSTS_ORGANIC_CONTROL = -200
  RUNNINGCOSTS_FERTILIZE = -50
  RUNNINGCOSTS_PESTICIDE = -50
  RUNNINGCOSTS_ORGANISMS = -100
  RUNNINGCOSTS_ANIMALS = -200
  RUNNINGCOSTS_BASE = {false => -500, true => -700}

  HARVEST_FIELDBEAN = {false => 18, true => 21}
  HARVEST_BARLEY = {false => 13, true => 14.5}
  HARVEST_OAT = {false => 12, true => 14}
  HARVEST_POTATOE = {false => 4, true => 5}
  HARVEST_CORN = {false => 15, true => 17}
  HARVEST_RYE = {false => 13, true => 14.5}
  HARVEST_WHEAT = {false => 15, true => 17}
  HARVEST_BEET = {false => 2, true => 2.5}

  after_initialize :set_defaults, :if => :new_record?

  def set_defaults
    self.number ||= 1
    self.submitted = false if self.submitted.nil?
    self.machines ||= '0'
    self.organic ||= false
    self.pesticide ||= false
    self.fertilize ||= false
    self.organisms ||= false
    self.save!
    self.create_result machines: MACHINES, organic: 'false', weather: 'Normal', vermin: 'Keine' unless self.result
    self.create_field unless self.field
  end

  def calculate_attributes
    rounds = self.player.rounds
    # self is the new round,
    # the current round is the round before it
    # the previous round is the round before the current one
    current_round = rounds.find_by number: self.number - 1
    if rounds.length > 2
      previous_round = rounds.find_by number: self.number - 2
    end

    ## overview
    ### animals
    animals = current_round.field.parcels.select { |parcel| parcel.plantation=='Tiere' }.count
    if animals > 0
      animals_per_parcel = (animals*8)/40.to_f
    else
      animals_per_parcel = 0
    end
    ### machines
    if current_round.machines.to_i > 0
      self.result.machines = current_round.result.machines + current_round.machines
    else
      self.result.machines = current_round.result.machines - MACHINE_AGING
    end
    ### organic
    if current_round.organic? and not current_round.fertilize? and not current_round.pesticide?
      self.result.organic = true
    end
    ### weather
    self.result.weather = self.player.game.weather[self.number-2]
    ### vermin
    self.result.vermin = self.player.game.vermin[self.number-2]

    ### parcel evaluation
    self.field.parcels.each do |new_parcel|
      current_parcel = current_round.field.parcels.find_by number: new_parcel.number
      if (rounds.length > 2)
        previous_parcel = previous_round.field.parcels.find_by number: new_parcel.number
      end

      # copy values from parcel of current round to parcel of new round
      new_parcel.plantation = current_parcel.plantation
      new_parcel.soil = current_parcel.soil
      new_parcel.nutrition = current_parcel.nutrition

      # identify cropsequence
      if (rounds.length > 2)
        new_parcel.cropsequence = CROPSEQUENCE[current_parcel.plantation][previous_parcel.plantation]
      else
        new_parcel.cropsequence = CROPSEQUENCE[current_parcel.plantation]["Brachland"]
      end

      # calculate soil
      soil_factor = 0
      # Tiere
      if current_parcel.plantation == 'Tiere'
        soil_factor = soil_factor
      elsif current_parcel.plantation == 'Brachland'
        # Brachland
        soil_factor += 0.01 * [SOIL - current_parcel.soil, 0].max * SOIL_FALLOW
      else
        # Fruchtfolge
        soil_factor += SOIL_CROPSEQUENCE if new_parcel.cropsequence == 'gut'
        soil_factor -= SOIL_CROPSEQUENCE if new_parcel.cropsequence == 'schlecht'
        # Getreidesorte
        case current_parcel.plantation
        when 'Ackerbohne', 'Hafer', 'Roggen', 'Zuckerruebe'
          soil_factor += SOIL_PLANTATION
        when 'Gerste', 'Kartoffel', 'Mais', 'Weizen'
          soil_factor -= SOIL_PLANTATION
        end
        # Dünger
        soil_factor -= SOIL_FERTILIZE if current_round.fertilize
        soil_factor -= ([animals_per_parcel, 1].max - 1) * SOIL_ANIMALS if animals_per_parcel > 0
        # Pflanzenschutz
        soil_factor -= SOIL_PESTICIDE if current_round.pesticide
        # Maschineneinsatz
        soil_factor -= (0.01 * (self.result.machines - MACHINES)) * (0.01 * 2 * current_parcel.soil - 0.5) * SOIL_MACHINE
        # Monokultur
        round_counter = 0
        if (rounds.length > 2)
          monoculture = (current_parcel.plantation == previous_parcel.plantation)
        else
          monoculture = false
        end

        while monoculture
          round_counter += 1
          if rounds.count > round_counter + 2
            monoculture = (current_parcel.plantation == rounds.find_by(number: self.number - 2 - round_counter).field.parcels.find_by(number: new_parcel.number).plantation)
          else
            monoculture = false
          end
        end
        soil_factor -= round_counter * SOIL_MONOCULTURE
        # Wetter
        soil_factor -= SOIL_DROUGHT if self.result.weather == 'Dürre'
        soil_factor -= SOIL_FLOOD if self.result.weather == 'Überschwemmung'
      end
      # Berechnung Bodenqualität
      new_parcel.soil += current_parcel.soil * soil_factor

      # calculate nutrition
      # Brachland oder Tiere
      if current_parcel.plantation == 'Tiere' || current_parcel.plantation == 'Brachland'
        new_parcel.nutrition = NUTRITION if current_parcel.nutrition > NUTRITION
      else
        nutrition_factor = 0
        nutrition_factor += NUTRITION_FERTILIZE if current_round.fertilize
        nutrition_factor += animals_per_parcel * NUTRITION_ANIMALS
        nutrition_factor += NUTRITION_FIELDBEAN if current_parcel.plantation == 'Ackerbohne'
        # scale with previous soil (good soil helps nutrition uptake) and previous nutrition (good nutrition blocks nutrition uptake)
        nutrition_factor *= 0.01 * current_parcel.soil * (1 - 0.01 * current_parcel.nutrition)
        new_parcel.nutrition += current_parcel.nutrition * nutrition_factor
      end

      # calculate harvest
      if current_parcel.plantation == 'Tiere' || current_parcel.plantation == 'Brachland'
        new_parcel.harvest_yield = 0
      else
        harvest = HARVEST[current_parcel.plantation]
        # Nährstoffe
        harvest *= (new_parcel.nutrition.to_f/NUTRITION) ** HARVEST_NUTRITION[current_parcel.plantation]
        # Bodenqualität
        harvest *= (new_parcel.soil.to_f/SOIL) ** HARVEST_SOIL[current_parcel.plantation]
        # Wetter
        harvest *= HARVEST_WEATHER[current_parcel.plantation][self.result.weather] unless self.result.weather == 'Normal'
        # Schädlinge
        if HARVEST_VERMIN[current_parcel.plantation][self.result.vermin]
          if current_round.pesticide
            harvest *= HARVEST_VERMIN_PESTICIDE
          elsif current_round.organisms
            harvest *= HARVEST_VERMIN_ORGANISM
          else
            harvest *= HARVEST_VERMIN_WITHOUT
          end
        end
        # Fruchtfolge
        #case new_parcel.cropsequence
        #  when 'gut'
        #    harvest *= 1 + HARVEST_CROPSEQUENCE
        #  when 'ok'
        #    harvest *= 1
        #  when 'schlecht'
        #    harvest *= 1 - HARVEST_CROPSEQUENCE
        #end
        # Vorfrucht / Effizienz
        round_counter = 0
        if (rounds.length > 2)
          efficiency = (current_parcel.plantation == previous_parcel.plantation)
        else
          efficiency = false
        end

        while efficiency
          round_counter += 1
          if rounds.count > round_counter + 2
            efficiency = (current_parcel.plantation == rounds.find_by(number: self.number - 2 - round_counter).field.parcels.find_by(number: new_parcel.number).plantation)
          else
            efficiency = false
          end
        end
        harvest *= 1 + round_counter * HARVEST_EFFICIENCY
        harvest *= 1 + HARVEST_EFFICIENCY**2 * (current_round.field.parcels.select { |parcel| parcel.plantation == current_parcel.plantation }.length - 1)
        # Maschineneinsatz
        harvest *= (0.01 * self.result.machines)**HARVEST_MACHINES
        # Nahrung Tiere
        harvest *= (1 - animals_per_parcel / HARVEST_ANIMALS)
        new_parcel.harvest_yield = harvest.to_i

        # nutrition decline scales with harvest yield
        unless current_parcel.plantation == 'Ackerbohne'
          new_parcel.nutrition -= (harvest/HARVEST[current_parcel.plantation]) * current_parcel.nutrition * NUTRITION_DECLINE
        end

        harvest_ratio = harvest/HARVEST[current_parcel.plantation]
        if harvest_ratio > 0.8
          new_parcel.harvest = 'sehr_hoch'
        elsif harvest_ratio > 0.6
          new_parcel.harvest = 'hoch'
        elsif harvest_ratio > 0.4
          new_parcel.harvest = 'maessig'
        elsif harvest_ratio > 0.2
          new_parcel.harvest = 'niedrig'
        elsif harvest_ratio > 0
          new_parcel.harvest = 'sehr_niedrig'
        else
          new_parcel.harvest = 'keiner'
        end
      end
    end

    # expenses
    ## seeds
    ### fieldbean
    self.result.expense.seed.fieldbean = current_round.field.parcels.where(plantation: 'Ackerbohne').count * SEED_FIELDBEAN[current_round.organic]
    ### barley
    self.result.expense.seed.barley = current_round.field.parcels.where(plantation: 'Gerste').count * SEED_BARLEY[current_round.organic]
    ### oat
    self.result.expense.seed.oat = current_round.field.parcels.where(plantation: 'Hafer').count * SEED_OAT[current_round.organic]
    ### potatoe
    self.result.expense.seed.potatoe = current_round.field.parcels.where(plantation: 'Kartoffel').count * SEED_POTATOE[current_round.organic]
    ### corn
    self.result.expense.seed.corn = current_round.field.parcels.where(plantation: 'Mais').count * SEED_CORN[current_round.organic]
    ### rye
    self.result.expense.seed.rye = current_round.field.parcels.where(plantation: 'Roggen').count * SEED_RYE[current_round.organic]
    ### wheat
    self.result.expense.seed.wheat = current_round.field.parcels.where(plantation: 'Weizen').count * SEED_WHEAT[current_round.organic]
    ### beet
    self.result.expense.seed.beet = current_round.field.parcels.where(plantation: 'Zuckerruebe').count * SEED_BEET[current_round.organic]
    ### seed sum
    self.result.expense.seed.sum = self.result.expense.seed.fieldbean + self.result.expense.seed.barley + self.result.expense.seed.oat + self.result.expense.seed.potatoe + self.result.expense.seed.corn + self.result.expense.seed.rye + self.result.expense.seed.wheat + self.result.expense.seed.beet
    ## save seeds
    self.result.expense.seed.save
    ## investments
    ### animals
    if (rounds.length > 2)
      existing_animals = previous_round.field.parcels.select { |parcel| parcel.plantation=='Tiere' }.count
    else
      existing_animals = 0
    end
    self.result.expense.investment.animals = [animals-existing_animals, 0].max * INVESTMENT_ANIMALS
    ### machines
    self.result.expense.investment.machines = 0.1 * current_round.machines * INVESTMENT_MACHINES
    ### sum
    self.result.expense.investment.sum = self.result.expense.investment.animals +
        self.result.expense.investment.machines
    ## save investments
    self.result.expense.investment.save
    ## running costs
    ### organic control
    self.result.expense.running_cost.organic_control = RUNNINGCOSTS_ORGANIC_CONTROL if current_round.organic
    ### fertilize
    self.result.expense.running_cost.fertilize = 40 * RUNNINGCOSTS_FERTILIZE if current_round.fertilize
    ### pesticide
    self.result.expense.running_cost.pesticide = 40 * RUNNINGCOSTS_PESTICIDE if current_round.pesticide
    ### organisms
    self.result.expense.running_cost.organisms = 40 * RUNNINGCOSTS_ORGANISMS if current_round.organisms
    ### animals
    self.result.expense.running_cost.animals = animals * RUNNINGCOSTS_ANIMALS
    ### basic cost
    self.result.expense.running_cost.base = 40 * RUNNINGCOSTS_BASE[current_round.organic] * (0.01 * self.result.machines)**0.4
    ### sum
    self.result.expense.running_cost.sum = self.result.expense.running_cost.organic_control +
        self.result.expense.running_cost.fertilize +
        self.result.expense.running_cost.pesticide +
        self.result.expense.running_cost.organisms +
        self.result.expense.running_cost.animals +
        self.result.expense.running_cost.base
    ## save running costs
    self.result.expense.running_cost.save
    # sum up expenses and save them
    self.result.expense.sum = self.result.expense.seed.sum +
        self.result.expense.investment.sum +
        self.result.expense.running_cost.sum
    self.result.expense.save
    ## harvest
    self.save
    self.field.save
    ### fieldbean
    self.result.income.harvest.fieldbean = self.field.parcels.where(plantation: 'Ackerbohne').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_FIELDBEAN[self.result.organic]
    ### barley
    self.result.income.harvest.barley = self.field.parcels.where(plantation: 'Gerste').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_BARLEY[self.result.organic]
    ### oat
    self.result.income.harvest.oat = self.field.parcels.where(plantation: 'Hafer').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_OAT[self.result.organic]
    ### potatoe
    self.result.income.harvest.potatoe = self.field.parcels.where(plantation: 'Kartoffel').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_POTATOE[self.result.organic]
    ### corn
    self.result.income.harvest.corn = self.field.parcels.where(plantation: 'Mais').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_CORN[self.result.organic]
    ### rye
    self.result.income.harvest.rye = self.field.parcels.where(plantation: 'Roggen').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_RYE[self.result.organic]
    ### wheat
    self.result.income.harvest.wheat = self.field.parcels.where(plantation: 'Weizen').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_WHEAT[self.result.organic]
    ### beet
    self.result.income.harvest.beet = self.field.parcels.where(plantation: 'Zuckerruebe').collect { |parcel| parcel.harvest_yield }.inject(:+).to_i * HARVEST_BEET[self.result.organic]
    ### sum
    self.result.income.harvest.sum = self.result.income.harvest.fieldbean +
        self.result.income.harvest.barley +
        self.result.income.harvest.oat +
        self.result.income.harvest.potatoe +
        self.result.income.harvest.corn +
        self.result.income.harvest.rye +
        self.result.income.harvest.wheat +
        self.result.income.harvest.beet
    ## save harvest and income
    self.result.income.harvest.save
    self.result.income.sum = self.result.income.harvest.sum
    self.result.income.save
    ## profit
    self.result.profit = self.result.income.sum + self.result.expense.sum
    ## capital
    self.result.capital = current_round.result.capital + self.result.profit
    self.result.save
  end
end
