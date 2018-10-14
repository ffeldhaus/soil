class CreateFields < ActiveRecord::Migration[5.2]
  def change
    create_table :fields do |t|
      t.boolean :submitted
      t.references :round, index: true

      t.timestamps
    end
  end
end
