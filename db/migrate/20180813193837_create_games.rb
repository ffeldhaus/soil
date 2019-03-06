class CreateGames < ActiveRecord::Migration[5.2]
  def change
    create_table :games do |t|
      t.integer :current_round
      t.integer :number_of_rounds
      t.string :name
      t.string :weather
      t.string :vermin
      t.references :admin, index: true

      t.timestamps
    end
  end
end
