class CreateInvestments < ActiveRecord::Migration[5.2]
  def change
    create_table :investments do |t|
      t.integer :sum
      t.integer :animals
      t.integer :machines
      t.references :expense, index: true

      t.timestamps
    end
  end
end
