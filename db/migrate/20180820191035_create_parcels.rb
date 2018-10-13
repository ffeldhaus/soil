class CreateParcels < ActiveRecord::Migration[5.2]
  def change
    create_table :parcels do |t|
      t.integer :number
      t.integer :nutrition
      t.integer :soil
      t.string :cropsequence
      t.integer :harvest_yield
      t.string :harvest
      t.string :plantation
      t.references :field, index: true

      t.timestamps
    end
  end
end
