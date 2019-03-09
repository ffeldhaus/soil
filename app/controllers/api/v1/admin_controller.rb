class Api::V1::AdminController < ApplicationController
  def create
    @admin = Admin.new(admin_params)
    if @admin.save
      # deliver registration confirmation email
      RegistrationConfirmationMailer.send_registration_confirmation_email(@admin).deliver
      redirect_to(@admin, :notice => 'Admin created')
    else
      render json: {error: 'Creating admin failed'}, status: :unprocessable_entity
    end
  end

  private

  def admin_params
    params.require(:admin).permit(:firstName, :lastName, :email, :password, :password_confirmation, :institution, :confirm_success_url)
  end
end