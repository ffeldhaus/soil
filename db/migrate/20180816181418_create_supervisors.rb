class CreateSupervisors < ActiveRecord::Migration[5.2]
  def change
    create_table :supervisors do |t|
      t.string :name
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :password_digest
      t.string :salt
      t.references :admin, index: true

      t.timestamps
    end
  end
end
