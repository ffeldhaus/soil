class CreateDecisions < ActiveRecord::Migration[5.2]
  def change
    create_table :decisions do |t|
      t.integer :machines
      t.boolean :organic
      t.boolean :pesticide
      t.boolean :fertilize
      t.boolean :organisms
      t.references :round, index: true

      t.timestamps
    end
  end
end
