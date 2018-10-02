class CreateSeeds < ActiveRecord::Migration[5.2]
  def change
    create_table :seeds do |t|
      t.integer :sum
      t.integer :fieldbean
      t.integer :barley
      t.integer :oat
      t.integer :potatoe
      t.integer :corn
      t.integer :rye
      t.integer :wheat
      t.integer :beet
      t.references :expense, index: true

      t.timestamps
    end
  end
end
