class CreateExpenses < ActiveRecord::Migration[5.2]
  def change
    create_table :expenses do |t|
      t.integer :sum
      t.references :result, index: true

      t.timestamps
    end
  end
end
