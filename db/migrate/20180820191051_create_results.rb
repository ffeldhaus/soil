class CreateResults < ActiveRecord::Migration[5.2]
  def change
    create_table :results do |t|
      t.integer :machines
      t.boolean :organic
      t.string  :weather
      t.string  :vermin
      t.integer :profit
      t.integer :capital
      t.references :round, index: true

      t.timestamps
    end
  end
end
