class CreateRunningCosts < ActiveRecord::Migration[5.2]
  def change
    create_table :running_costs do |t|
      t.integer :sum
      t.integer :organic_control
      t.integer :fertilize
      t.integer :pesticide
      t.integer :organisms
      t.integer :animals
      t.integer :base
      t.references :expense, index: true

      t.timestamps
    end
  end
end
