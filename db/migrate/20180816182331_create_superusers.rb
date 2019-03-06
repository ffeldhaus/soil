class CreateSuperusers < ActiveRecord::Migration[5.2]
  def change
    create_table :superusers do |t|
      t.string :name
      t.string :password_digest
      t.string :salt

      t.timestamps
    end
  end
end
